import { User } from "../models/user.models.js";
import { OTP } from "../models/otp.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from "../utils/emailService.js";

/**
 * Generate access and refresh tokens
 * @param {Object} user - User document
 * @returns {Object} - Object containing tokens
 */
const generateTokens = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        // Save refresh token to user document
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error generating tokens");
    }
};

/**
 * Register a new user
 */
const registerUser = asyncHandler(async (req, res) => {
    // Get user details from request
    const { userName, email, fullName, password, phoneNumber, collegeName, rollNumber, kgpMail } = req.body;
    
    // Validate required fields
    if (!userName || !email || !fullName || !password) {
        throw new ApiError(400, "Username, Email, fullName, and password are required");
    }
    
    // Check if user already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
        throw new ApiError(409, "User with this email already exists");
    }
    const existingUserByUsername = await User.findOne({ userName });
    if (existingUserByUsername) {
        throw new ApiError(409, "User with this username already exists");
    }
    
    // Create a new user
    const user = await User.create({
        userName,
        email,
        fullName,
        password,
        phoneNumber,
        collegeName,
        rollNumber,
        kgpMail
    });
    
    // Generate and save OTP
    const otp = generateOTP();
    await OTP.create({ email, otp });
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, fullName);
    
    if (!emailSent) {
        throw new ApiError(500, "Failed to send verification email");
    }
    
    // Return response without sensitive information
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
    // Debug request information
    console.log("VERIFY EMAIL REQUEST:");
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Body:", JSON.stringify(req.body));
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Raw Body:", req.rawBody || "Not available");
    
    // Get email and OTP from request - try multiple possible sources
    let email, otp;
    
    // Case 1: Normal JSON body
    if (req.body && typeof req.body === 'object') {
        email = req.body.email;
        otp = req.body.otp;
    }
    
    // Case 2: Try to parse rawBody if it exists and we don't have email/otp yet
    if ((!email || !otp) && req.rawBody) {
        try {
            // Check if rawBody is JSON
            if (typeof req.rawBody === 'string' && 
                (req.rawBody.trim().startsWith('{') || req.rawBody.trim().startsWith('['))) {
                const parsedBody = JSON.parse(req.rawBody);
                email = email || parsedBody.email;
                otp = otp || parsedBody.otp;
            }
        } catch (error) {
            console.error("Failed to parse raw body:", error);
        }
    }
    
    // Case 3: URL encoded form data
    if ((!email || !otp) && req.body) {
        email = email || req.body.email;
        otp = otp || req.body.otp;
    }
    
    console.log("Final extracted email:", email);
    console.log("Final extracted otp:", otp);
    
    // Validate required fields
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }
    
    // Find the OTP document
    const otpRecord = await OTP.findOne({ email });
    
    if (!otpRecord) {
        throw new ApiError(400, "OTP expired or not found");
    }
    
    // Verify OTP
    const isValid = await otpRecord.verifyOTP(otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }
    
    // Update user as verified
    const user = await User.findOneAndUpdate(
        { email },
        { emailVerified: true },
        { new: true }
    ).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // Delete the OTP document
    await OTP.findByIdAndDelete(otpRecord._id);
    
    // Send welcome email
    sendWelcomeEmail(email, user.fullName).catch(error => {
        console.error("Error sending welcome email:", error);
    });
    
    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);
    
    // Set cookies
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
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // If user is already verified, return error
    if (user.emailVerified) {
        throw new ApiError(400, "Email is already verified");
    }
    
    // Delete any existing OTP
    await OTP.deleteMany({ email });
    
    // Generate and save new OTP
    const otp = generateOTP();
    await OTP.create({ email, otp });
    
    // Send OTP email
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
        throw new ApiError(400, "Email and password are required");
    }
    
    // Find user
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

    
    // Check if email is verified
    if (!user.emailVerified) {
        // Generate new OTP
        const otp = generateOTP();
        await OTP.findOneAndDelete({ email });
        await OTP.create({ email, otp });
        
        // Send OTP
        await sendOTPEmail(email, otp, user.fullName);
        
        throw new ApiError(403, "Email not verified. New verification OTP has been sent.");
    }
    
    // Check if password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);
    
    // Get user without sensitive information
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    // Set cookies
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
 * Logout user
 */
const logoutUser = asyncHandler(async (req, res) => {
    // Clear refresh token in database
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );
    
    // Clear cookies
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

// Default export
export default {
    registerUser,
    verifyEmail,
    resendOTP,
    loginUser,
    logoutUser
};