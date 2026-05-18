// src/BACKEND/middleware/checkRole.cjs
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Login first 💖" });
    }

    const userRole = req.user.role;

    // Allow projectManager to pass through for routes that will check ownership
    if (
      allowedRoles.includes("projectManager") &&
      userRole === "projectManager"
    ) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Not enough permissions for this action 😭" });
    }

    next();
  };
};

module.exports = { checkRole };
