"use client";

import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function LoginPage() {
  useEffect(() => {
    const stored = localStorage.getItem("ts-theme") || "light";
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "var(--bg)" }}>

      {/* Card */}
      <div className="w-full max-w-sm rounded-[12px] p-8"
           style={{
             background: "var(--panel)",
             border: "1px solid var(--border)",
           }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center"
               style={{ background: "var(--ai-grad)", boxShadow: "var(--sh-2)" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "white", letterSpacing: "-0.04em" }}>TS</span>
          </div>
          <div>
            <h1 className="text-[20px] font-bold leading-tight" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
              TalkSpace
            </h1>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Sign in to continue</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={`${API_URL}/oauth2/authorization/google`}
            className="flex items-center justify-center gap-3 rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all duration-150"
            style={{
              background: "var(--panel-3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.background = "var(--hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.background = "var(--panel-3)";
            }}
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <a
            href={`${API_URL}/oauth2/authorization/github`}
            className="flex items-center justify-center gap-3 rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all duration-150"
            style={{
              background: "var(--text)",
              color: "var(--bg)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <GitHubIcon />
            Continue with GitHub
          </a>
        </div>

        <p className="text-[12px] text-center mt-6" style={{ color: "var(--text-faint)" }}>
          By signing in you agree to use this app responsibly.
        </p>

        <p className="text-center mt-3">
          <a href="/browse" className="text-[12px] transition-colors"
             style={{ color: "var(--text-faint)" }}
             onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
             onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}>
            Browse public rooms without signing in →
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
