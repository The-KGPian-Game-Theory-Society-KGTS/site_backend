// controllers/auth.controller.js
import { User } from "../models/user.models.js";
import { OTP } from "../models/otp.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateOTP, sendOTPEmail, sendWelcomeEmail, sendResetPasswordOTPEmail,sendKGPOTPEmail } from "../utils/emailService.js";

/**
 * Generate access and refresh tokens
 */
const generateTokens = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error generating tokens");
    }
};

/**
 * Register a new user (removed rollNumber)
 */
const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, fullName, password, phoneNumber, collegeName, kgpMail } = req.body;
    
    if (!userName || !email || !fullName || !password) {
        throw new ApiError(400, "Username, Email, fullName, and password are required");
    }
    
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
        throw new ApiError(409, "User with this email already exists");
    }
    
    const existingUserByUsername = await User.findOne({ userName });
    if (existingUserByUsername) {
        throw new ApiError(409, "User with this username already exists");
    }
    
    // Create user without verification for phone/kgpMail
    const user = await User.create({
        userName,
        email,
        fullName,
        password,
        collegeName,
        // Only store if provided, but not verified yet
        // ...(phoneNumber && { phoneNumber, phoneVerified: false }),
        ...(kgpMail && { kgpMail, kgpMailVerified: false })
    });
    
    // Generate and save OTP for email verification
    const otp = generateOTP();
    await OTP.create({ 
        identifier: email, 
        otp, 
        type: 'email_verification',
        userId: user._id
    });
    
    const emailSent = await sendOTPEmail(email, otp, fullName);
    
    if (!emailSent) {
        throw new ApiError(500, "Failed to send verification email");
    }
    
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
    return res.status(201).json(
        new ApiResponse(
            201,
            { user: createdUser },
            "User registered successfully. Please verify your email."
        )
    );
});

/**
 * Verify email with OTP
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }
    
    const otpRecord = await OTP.findOne({ 
        identifier: email, 
        type: 'email_verification' 
    });
    
    if (!otpRecord) {
        throw new ApiError(400, "OTP expired or not found");
    }
    
    const isValid = await otpRecord.verifyOTP(otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }
    
    const user = await User.findOneAndUpdate(
        { email },
        { emailVerified: true },
        { new: true }
    ).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    await OTP.findByIdAndDelete(otpRecord._id);
    
    sendWelcomeEmail(email, user.fullName).catch(error => {
        console.error("Error sending welcome email:", error);
    });
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user, accessToken, refreshToken },
                "Email verified successfully"
            )
        );
});

/**
 * Resend verification OTP
 */
const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        throw new ApiError(400, "Email is required");
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    if (user.emailVerified) {
        throw new ApiError(400, "Email is already verified");
    }
    
    await OTP.deleteMany({ identifier: email, type: 'email_verification' });
    
    const otp = generateOTP();
    await OTP.create({ 
        identifier: email, 
        otp, 
        type: 'email_verification',
        userId: user._id
    });
    
    const emailSent = await sendOTPEmail(email, otp, user.fullName);
    
    if (!emailSent) {
        throw new ApiError(500, "Failed to send verification email");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Verification OTP sent successfully"
        )
    );
});

/**
 * Login with email and password
 */
const loginUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;
    
    if ((!userName && !email) || !password) {
        throw new ApiError(400, "Email/Username and password are required");
    }
    
    let user;

    if (email) {
        user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user && userName) {
        user = await User.findOne({ userName });
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    if (!user.emailVerified) {
        const otp = generateOTP();
        await OTP.findOneAndDelete({ identifier: user.email, type: 'email_verification' });
        await OTP.create({ 
            identifier: user.email, 
            otp, 
            type: 'email_verification',
            userId: user._id
        });
        
        await sendOTPEmail(user.email, otp, user.fullName);
        
        throw new ApiError(403, "Email not verified. New verification OTP has been sent.");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "Logged in successfully"
            )
        );
});

/**
 * Forgot password - Send OTP to email
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        throw new ApiError(400, "Email is required");
    }
    
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
        throw new ApiError(404, "User with this email does not exist");
    }
    
    // Delete any existing password reset OTPs
    await OTP.deleteMany({ identifier: email, type: 'password_reset' });
    
    const otp = generateOTP();
    await OTP.create({ 
        identifier: email, 
        otp, 
        type: 'password_reset',
        userId: user._id
    });
    
    const emailSent = await sendResetPasswordOTPEmail(email, otp);
    
    if (!emailSent) {
        throw new ApiError(500, "Failed to send password reset email");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password reset OTP sent to your email"
        )
    );
});

/**
 * Reset password with OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }
    
    if (newPassword.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }
    
    const otpRecord = await OTP.findOne({ 
        identifier: email, 
        type: 'password_reset' 
    });
    
    if (!otpRecord) {
        throw new ApiError(400, "OTP expired or not found");
    }
    
    const isValid = await otpRecord.verifyOTP(otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }
    
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    user.password = newPassword;
    await user.save();
    
    await OTP.findByIdAndDelete(otpRecord._id);
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password reset successfully"
        )
    );
});

/**
 * Send phone verification OTP
 */
// const sendPhoneVerificationOTP = asyncHandler(async (req, res) => {
//     const { phoneNumber } = req.body;
//     const userId = req.user._id;
    
//     if (!phoneNumber) {
//         throw new ApiError(400, "Phone number is required");
//     }
    
//     // Validate phone number format
//     if (!/^[0-9]{10}$/.test(phoneNumber)) {
//         throw new ApiError(400, "Please enter a valid 10-digit phone number");
//     }
    
//     // Check if phone number is already verified by another user
//     const existingUser = await User.findOne({ 
//         phoneNumber, 
//         phoneVerified: true,
//         _id: { $ne: userId }
//     });
    
//     if (existingUser) {
//         throw new ApiError(409, "This phone number is already verified by another user");
//     }
    
//     // Delete any existing phone verification OTPs
//     await OTP.deleteMany({ identifier: phoneNumber, type: 'phone_verification' });
    
//     const otp = generateOTP();
//     await OTP.create({ 
//         identifier: phoneNumber, 
//         otp, 
//         type: 'phone_verification',
//         userId: userId
//     });
    
//     const smsSent = await sendPhoneOTP(phoneNumber, otp, req.user.fullName);
    
//     if (!smsSent) {
//         throw new ApiError(500, "Failed to send SMS OTP");
//     }
    
//     return res.status(200).json(
//         new ApiResponse(
//             200,
//             {},
//             "Phone verification OTP sent successfully. Check console for development OTP."
//         )
//     );
// });

/**
 * Verify phone number with OTP
 */
// const verifyPhoneNumber = asyncHandler(async (req, res) => {
//     const { phoneNumber, otp } = req.body;
//     const userId = req.user._id;
    
//     if (!phoneNumber || !otp) {
//         throw new ApiError(400, "Phone number and OTP are required");
//     }
    
//     const otpRecord = await OTP.findOne({ 
//         identifier: phoneNumber, 
//         type: 'phone_verification',
//         userId: userId
//     });
    
//     if (!otpRecord) {
//         throw new ApiError(400, "OTP expired or not found");
//     }
    
//     const isValid = await otpRecord.verifyOTP(otp);
//     if (!isValid) {
//         throw new ApiError(400, "Invalid OTP");
//     }
    
//     const user = await User.findByIdAndUpdate(
//         userId,
//         { 
//             phoneNumber,
//             phoneVerified: true 
//         },
//         { new: true }
//     ).select("-password -refreshToken");
    
//     await OTP.findByIdAndDelete(otpRecord._id);
    
//     return res.status(200).json(
//         new ApiResponse(
//             200,
//             { user },
//             "Phone number verified successfully"
//         )
//     );
// });

/**
 * Send KGP mail verification OTP
 */
const sendKgpMailVerificationOTP = asyncHandler(async (req, res) => {
    const { kgpMail } = req.body;
    const userId = req.user._id;
    
    if (!kgpMail) {
        throw new ApiError(400, "Institute email is required");
    }
    
    // Validate KGP mail format
    if (!/^[a-zA-Z0-9._%+-]+@kgpian\.iitkgp\.ac\.in$/.test(kgpMail)) {
        throw new ApiError(400, "Please enter a valid IIT Kgp institute email ID");
    }
    
    // Check if KGP mail is already verified by another user
    const existingUser = await User.findOne({ 
        kgpMail, 
        kgpMailVerified: true,
        _id: { $ne: userId }
    });
    
    if (existingUser) {
        throw new ApiError(409, "This institute email is already verified by another user");
    }
    
    // Delete any existing KGP mail verification OTPs
    await OTP.deleteMany({ identifier: kgpMail, type: 'kgp_mail_verification' });
    
    const otp = generateOTP();
    await OTP.create({ 
        identifier: kgpMail, 
        otp, 
        type: 'kgp_mail_verification',
        userId: userId
    });
    
    const emailSent = await sendKGPOTPEmail(kgpMail, otp, req.user.fullName);
    
    if (!emailSent) {
        throw new ApiError(500, "Failed to send institute email verification");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Institute email verification OTP sent successfully"
        )
    );
});

/**
 * Verify KGP mail with OTP
 */
const verifyKgpMail = asyncHandler(async (req, res) => {
    const { kgpMail, otp } = req.body;
    const userId = req.user._id;
    
    if (!kgpMail || !otp) {
        throw new ApiError(400, "Institute email and OTP are required");
    }
    
    const otpRecord = await OTP.findOne({ 
        identifier: kgpMail, 
        type: 'kgp_mail_verification',
        userId: userId
    });
    
    if (!otpRecord) {
        throw new ApiError(400, "OTP expired or not found");
    }
    
    const isValid = await otpRecord.verifyOTP(otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }
    
    const user = await User.findByIdAndUpdate(
        userId,
        { 
            kgpMail,
            kgpMailVerified: true 
        },
        { new: true }
    ).select("-password -refreshToken");
    
    await OTP.findByIdAndDelete(otpRecord._id);
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { user },
            "Institute email verified successfully"
        )
    );
});

/**
 * Logout user
 */
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );
    
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };
    
    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                {},
                "Logged out successfully"
            )
        );
});

export default {
    registerUser,
    verifyEmail,
    resendOTP,
    loginUser,
    forgotPassword,
    resetPassword,
    // sendPhoneVerificationOTP,
    // verifyPhoneNumber,
    sendKgpMailVerificationOTP,
    verifyKgpMail,
    logoutUser
};
