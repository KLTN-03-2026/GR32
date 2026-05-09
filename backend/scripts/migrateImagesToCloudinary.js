const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Import models
const Product = require("../src/models/Product");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Script to migrate existing local images to Cloudinary
 * Run this script after setting up Cloudinary credentials
 */
async function migrateImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all products with local images
    const products = await Product.find({
      $or: [
        { hinh_anh: { $regex: "^/uploads/" } },
        { "danh_sach_anh.0": { $regex: "^/uploads/" } }
      ]
    });

    console.log(`📦 Found ${products.length} products with local images`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        console.log(`🔄 Migrating product: ${product.ten_san_pham}`);

        // Migrate main image
        if (product.hinh_anh && product.hinh_anh.startsWith("/uploads/")) {
          const localPath = path.join(__dirname, "..", product.hinh_anh);
          
          if (fs.existsSync(localPath)) {
            const result = await cloudinary.uploader.upload(localPath, {
              folder: "products",
              public_id: `product-${product._id}-main`,
              transformation: [
                { quality: "auto:good" },
                { fetch_format: "auto" }
              ]
            });
            
            product.hinh_anh = result.secure_url;
            console.log(`✅ Main image migrated: ${result.secure_url}`);
          } else {
            console.log(`⚠️  Main image file not found: ${localPath}`);
          }
        }

        // Migrate additional images
        if (product.danh_sach_anh && product.danh_sach_anh.length > 0) {
          const newImageList = [];
          
          for (let i = 0; i < product.danh_sach_anh.length; i++) {
            const imageUrl = product.danh_sach_anh[i];
            
            if (imageUrl && imageUrl.startsWith("/uploads/")) {
              const localPath = path.join(__dirname, "..", imageUrl);
              
              if (fs.existsSync(localPath)) {
                const result = await cloudinary.uploader.upload(localPath, {
                  folder: "products",
                  public_id: `product-${product._id}-${i}`,
                  transformation: [
                    { quality: "auto:good" },
                    { fetch_format: "auto" }
                  ]
                });
                
                newImageList.push(result.secure_url);
                console.log(`✅ Additional image ${i + 1} migrated: ${result.secure_url}`);
              } else {
                console.log(`⚠️  Additional image ${i + 1} file not found: ${localPath}`);
                newImageList.push(imageUrl); // Keep original if file not found
              }
            } else {
              newImageList.push(imageUrl); // Keep if already a URL
            }
          }
          
          product.danh_sach_anh = newImageList;
        }

        await product.save();
        migratedCount++;
        console.log(`💾 Product ${product.ten_san_pham} updated successfully`);

      } catch (error) {
        console.error(`❌ Error migrating product ${product.ten_san_pham}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} products`);
    console.log(`❌ Failed migrations: ${errorCount} products`);

    // Close database connection
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateImages();
}

module.exports = migrateImages;
