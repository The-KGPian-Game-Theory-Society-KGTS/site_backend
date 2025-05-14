import { Router } from "express";
import blogController from "../controllers/blog.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
/**
 * @route GET /api/blogs
 * @description Get all blogs with optional category filter
 * @access Public
 */
router.get("/", blogController.getAllBlogs);

/**
 * @route GET /api/blogs/link/:link
 * @description Get a single blog by external link
 * @access Public
 */
router.get("/link/:link", blogController.getBlogByExternalLink);

/**
 * @route GET /api/blogs/:id
 * @description Get a single blog by ID
 * @access Public
 */
router.get("/:id", blogController.getBlogById);

// Admin routes
/**
 * @route POST /api/blogs
 * @description Create a new blog
 * @access Admin
 */
router.post("/", authMiddleware.verifyJWT, authMiddleware.isAdmin, blogController.createBlog);

/**
 * @route PUT /api/blogs/:id
 * @description Update a blog
 * @access Admin
 */
router.put("/:id", authMiddleware.verifyJWT, authMiddleware.isAdmin, blogController.updateBlog);

/**
 * @route DELETE /api/blogs/:id
 * @description Delete a blog
 * @access Admin
 */
router.delete("/:id", authMiddleware.verifyJWT, authMiddleware.isAdmin, blogController.deleteBlog);

export default router; 