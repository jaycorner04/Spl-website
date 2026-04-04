import SectionHeader from "../../components/common/SectionHeader";
import VenuesGrid from "../../components/venue/VenuesGrid";
import useVenues from "../../hooks/useVenues";

export default function VenuesPage() {
  const { venues, loading, error } = useVenues();

  const formattedVenues = venues.map((venue) => ({
    id: venue.id,
    groundName: venue.ground_name,
    location: venue.location,
    city: venue.city,
    capacity: venue.capacity,
    contactPerson: venue.contact_person,
    contactPhone: venue.contact_phone,
  }));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
          <SectionHeader title="SPL" highlight="VENUES" darkMode={false} />

          <p className="max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
            Explore all SPL venues including ground name, city, location,
            capacity, and contact details in a responsive layout.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Loading venues...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        ) : formattedVenues.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            No venues found.
          </div>
        ) : (
          <VenuesGrid venues={formattedVenues} />
        )}
      </section>
    </div>
  );
}