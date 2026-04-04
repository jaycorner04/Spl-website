import { useSearchParams } from "react-router-dom";
import SectionHeader from "../../components/common/SectionHeader";

export default function NewsPage() {
  const [searchParams] = useSearchParams();

  const type = searchParams.get("type");
  const search = searchParams.get("search");

  console.log("type:", type);
  console.log("search:", search);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
          <SectionHeader title="SPL" highlight="NEWS" darkMode={false} />
          <p className="max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
            News page
          </p>
        </div>
      </section>
    </div>
  );
}