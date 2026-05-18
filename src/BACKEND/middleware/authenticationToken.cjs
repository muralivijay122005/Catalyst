// src/BACKEND/middleware/authenticateToken.cjs
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token required" });

    jwt.verify(
        token,
        process.env.JWT_SECRET || "supersecretjwtkeychangeitinprod",
        async (err, decoded) => {
            if (err) return res.status(403).json({ message: "Invalid token" });
            
            // CRITICAL: Verify user still exists (fixes issues after seeding)
            try {
                const { User } = require("../models/index.cjs");
                const user = await User.findById(decoded.id);
                if (!user) return res.status(401).json({ message: "User no longer exists" });
                
                req.user = user; // Attach full user object
                next();
            } catch (error) {
                return res.status(500).json({ message: "Auth error" });
            }
        }
    );
}

module.exports = { authenticateToken };
