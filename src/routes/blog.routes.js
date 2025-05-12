import { Router } from "express";
import { 
    createBlog, 
    updateBlog, 
    deleteBlog, 
    getAllBlogs, 
    getBlogById,
    getBlogByExternalLink
} from "../controllers/blog.controller.js";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
/**
 * @route GET /api/blogs
 * @description Get all blogs with optional category filter
 * @access Public
 */
router.get("/", getAllBlogs);

/**
 * @route GET /api/blogs/link/:link
 * @description Get a single blog by external link
 * @access Public
 */
router.get("/link/:link", getBlogByExternalLink);

/**
 * @route GET /api/blogs/:id
 * @description Get a single blog by ID
 * @access Public
 */
router.get("/:id", getBlogById);

// Admin routes
/**
 * @route POST /api/blogs
 * @description Create a new blog
 * @access Admin
 */
router.post("/", verifyJWT, isAdmin, createBlog);

/**
 * @route PUT /api/blogs/:id
 * @description Update a blog
 * @access Admin
 */
router.put("/:id", verifyJWT, isAdmin, updateBlog);

/**
 * @route DELETE /api/blogs/:id
 * @description Delete a blog
 * @access Admin
 */
router.delete("/:id", verifyJWT, isAdmin, deleteBlog);

export default router; 