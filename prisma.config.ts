import dotenv from "dotenv";
import path from "path";

// تحميل متغيرات البيئة من ملف .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export default {
  schema: "./schema.prisma",
  datasource: {
    // استخدام الرابط المباشر كحل احتياطي في حال لم يتم قراءة الملف
    url:
      process.env.DATABASE_URL ||
      "postgresql://neondb_owner:npg_T1ZefY7bjcAu@ep-solitary-tree-ahzmqtlv-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
};
