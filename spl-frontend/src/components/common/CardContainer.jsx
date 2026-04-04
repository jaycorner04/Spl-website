export default function CardContainer({ children }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-white/10">
      {children}
    </div>
  );
}