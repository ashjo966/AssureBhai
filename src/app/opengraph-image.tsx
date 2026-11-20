import { ImageResponse } from "next/og";

export const alt = "AssureBhai - Your Insurance Policy, Simplified";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0B0F19",
          backgroundImage:
            "radial-gradient(circle at 50% 20%, rgba(79, 70, 229, 0.25) 0%, rgba(11, 15, 25, 0) 65%), radial-gradient(circle at 85% 80%, rgba(225, 153, 52, 0.15) 0%, rgba(11, 15, 25, 0) 50%)",
          padding: "56px 64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Top Bar with Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Logo Shield Icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#4F46E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 16px rgba(79, 70, 229, 0.4)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2.5L4.5 6.2V11.5C4.5 15.8 7.7 19.8 12 21.2C16.3 19.8 19.5 15.8 19.5 11.5V6.2L12 2.5Z"
                  fill="#4338CA"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle
                  cx="11.2"
                  cy="10.8"
                  r="3.2"
                  stroke="#E19934"
                  strokeWidth="1.8"
                  fill="none"
                />
                <line
                  x1="13.5"
                  y1="13.1"
                  x2="16.5"
                  y2="16.1"
                  stroke="#E19934"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.5px",
              }}
            >
              Assure<span style={{ color: "#E19934" }}>Bhai</span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(225, 153, 52, 0.12)",
              border: "1px solid rgba(225, 153, 52, 0.35)",
              borderRadius: "9999px",
              padding: "8px 18px",
              color: "#E19934",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.2px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#E19934",
              }}
            />
            Official MoSPI Benchmarks
          </div>
        </div>

        {/* Center Main Stage */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "920px",
          }}
        >
          {/* Main Title */}
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              margin: "0 0 16px 0",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            Assure<span style={{ color: "#E19934" }}>Bhai</span>
          </h1>

          {/* Tagline */}
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#818CF8",
              marginBottom: "16px",
              letterSpacing: "-0.5px",
            }}
          >
            Your insurance policy, simplified.
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: "#94A3B8",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "800px",
            }}
          >
            Stress-test your Health and Life insurance policies against official
            and hyperlocal Indian government statistics.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#CBD5E1",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Hyperlocal Indian PIN Data
          </div>

          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#475569",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#CBD5E1",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E19934" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Statutory IRDAI Benchmarks
          </div>

          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#475569",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#CBD5E1",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            100% In-Memory &amp; Private
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
