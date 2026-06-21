"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4" style={{ maxWidth: 480 }}>
        <div className="mb-4">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc3545"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-1">
          You don&apos;t have permission to access this page.
        </p>
        <p className="text-gray-500 mb-4">
          Role: <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500 text-white">{user?.role}</span>
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Only Admin and HR roles can access the chat dashboard.
          <br />
          If you&apos;re an employee, you can join via invitation code.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => router.push("/")}
          >
            Back to Home
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
