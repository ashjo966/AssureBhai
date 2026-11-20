import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#4F46E5",
          borderRadius: "7px",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield Outline in White */}
          <path
            d="M12 2.5L4.5 6.2V11.5C4.5 15.8 7.7 19.8 12 21.2C16.3 19.8 19.5 15.8 19.5 11.5V6.2L12 2.5Z"
            fill="#4338CA"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Centered Single-Handle Magnifying Glass in #E19934 */}
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
    ),
    {
      ...size,
    }
  );
}

