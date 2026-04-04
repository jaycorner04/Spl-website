export default function SectionHeader({
  title,
  highlight,
  darkMode = true,
}) {
  return (
    <div className="mb-8">
      <h2
        className={`font-heading text-[2rem] tracking-[0.08em] sm:text-5xl ${
          darkMode ? "text-[#ffd9e8]" : "text-[#853953]"
        }`}
      >
        {title} <span className={darkMode ? "text-white" : "text-[#a55a75]"}>{highlight}</span>
      </h2>
    </div>
  );
}
