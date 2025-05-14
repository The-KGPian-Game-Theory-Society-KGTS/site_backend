import { Blog } from "../models/blog.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create a new blog (Admin only)
 */
const createBlog = asyncHandler(async (req, res) => {
    const { title, author, image, date, words, excerpt, content, category, externalLink } = req.body;
    
    // Validate required fields
    if (!title || !image || !date || !excerpt || !content || !category || !externalLink) {
        throw new ApiError(400, "All required fields must be provided");
    }
    
    // Check if blog with same title already exists
    const existingBlog = await Blog.findOne({ title });
    if (existingBlog) {
        throw new ApiError(409, "Blog with this title already exists");
    }
    
    // Check if blog with same external link already exists
    const existingBlogWithLink = await Blog.findOne({ externalLink });
    if (existingBlogWithLink) {
        throw new ApiError(409, "Blog with this external link already exists");
    }
    
    // Create blog
    const blog = await Blog.create({
        title,
        author,
        image,
        date,
        words: words || content.split(/\s+/).length,
        excerpt,
        content,
        category,
        externalLink
    });
    
    return res.status(201).json(
        new ApiResponse(
            201,
            { blog },
            "Blog created successfully"
        )
    );
});

/**
 * Update an existing blog (Admin only)
 */
const updateBlog = asyncHandler(async (req, res) => {
    const blogId = req.params.id;
    const { title, author, image, date, words, excerpt, content, category, externalLink } = req.body;
    
    // Validate blog ID
    if (!blogId) {
        throw new ApiError(400, "Blog ID is required");
    }
    
    // Check if blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }
    
    // Check if updating to a title that already exists (but not the same blog)
    if (title && title !== blog.title) {
        const blogWithTitle = await Blog.findOne({ title });
        if (blogWithTitle) {
            throw new ApiError(409, "Blog with this title already exists");
        }
    }
    
    // Check if updating to an external link that already exists (but not the same blog)
    if (externalLink && externalLink !== blog.externalLink) {
        const blogWithLink = await Blog.findOne({ externalLink });
        if (blogWithLink) {
            throw new ApiError(409, "Blog with this external link already exists");
        }
    }
    
    // Calculate words if content is updated but words is not provided
    let wordCount = words;
    if (content && !words) {
        wordCount = content.split(/\s+/).length;
    }
    
    // Update blog
    const updatedBlog = await Blog.findByIdAndUpdate(
        blogId,
        {
            title: title || blog.title,
            author: author || blog.author,
            image: image || blog.image,
            date: date || blog.date,
            words: wordCount || blog.words,
            excerpt: excerpt || blog.excerpt,
            content: content || blog.content,
            category: category || blog.category,
            externalLink: externalLink || blog.externalLink
        },
        { new: true, runValidators: true }
    );
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { blog: updatedBlog },
            "Blog updated successfully"
        )
    );
});

/**
 * Delete a blog (Admin only)
 */
const deleteBlog = asyncHandler(async (req, res) => {
    const blogId = req.params.id;
    
    // Validate blog ID
    if (!blogId) {
        throw new ApiError(400, "Blog ID is required");
    }
    
    // Check if blog exists and delete
    const blog = await Blog.findByIdAndDelete(blogId);
    
    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Blog deleted successfully"
        )
    );
});

/**
 * Get all blogs with optional category filter
 */
const getAllBlogs = asyncHandler(async (req, res) => {
    const { category } = req.query;
    
    // Build query
    const query = {};
    if (category) {
        query.category = category;
    }
    
    // Get blogs with limited content
    const blogs = await Blog.find(query)
        .select("title author image date words excerpt category externalLink createdAt updatedAt")
        .sort({ createdAt: -1 });
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { blogs },
            "Blogs fetched successfully"
        )
    );
});

/**
 * Get a single blog by ID
 */
const getBlogById = asyncHandler(async (req, res) => {
    const blogId = req.params.id;
    
    // Validate blog ID
    if (!blogId) {
        throw new ApiError(400, "Blog ID is required");
    }
    
    // Get blog
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { blog },
            "Blog fetched successfully"
        )
    );
});

/**
 * Get a single blog by external link
 */
const getBlogByExternalLink = asyncHandler(async (req, res) => {
    const { link } = req.params;
    
    // Validate link
    if (!link) {
        throw new ApiError(400, "External link is required");
    }
    
    // Get blog
    const blog = await Blog.findOne({ externalLink: link });
    
    if (!blog) {
        throw new ApiError(404, "Blog not found");
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { blog },
            "Blog fetched successfully"
        )
    );
});

// Default export for all functions
export default {
    createBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    getBlogByExternalLink
};