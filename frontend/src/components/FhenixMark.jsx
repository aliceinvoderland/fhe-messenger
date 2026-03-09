export default function FhenixMark({ className = "", title = "Fhenix" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <g fill="none" fillRule="evenodd">
        <path
          d="M40 34c-16 22-24 44-24 66s8 44 24 66h18c-13-21-19-43-19-66s6-45 19-66H40Z"
          fill="rgba(79,94,108,0.55)"
        />
        <path
          d="M160 34h-18c13 21 19 43 19 66s-6 45-19 66h18c16-22 24-44 24-66s-8-44-24-66Z"
          fill="rgba(79,94,108,0.55)"
        />
        <path
          d="M106 46v16H84c-9.3 0-14 4.7-14 14v8h31v17H70v53H48v-53H35V84h13v-9c0-14.7 4.1-25.2 12.3-31.6C68.4 37.1 80 34 95 34c3.5 0 7.2.2 11 .6Z"
          fill="#F6F3EE"
        />
        <path
          d="m129.3 76.5 10.4 15 10.4-15h15.6l-14.8 20.6 16.3 22.9h-15.7l-11.8-16.9-11.7 16.9h-15.7l16.2-22.9-14.8-20.6h15.6Z"
          fill="#12E7F0"
          transform="rotate(8 139.7 98.25)"
        />
      </g>
    </svg>
  );
}
