import VenueCard from "./VenueCard";

export default function VenuesGrid({ venues = [] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard
          key={venue.id}
          groundName={venue.groundName}
          location={venue.location}
          city={venue.city}
          capacity={venue.capacity}
          contactPerson={venue.contactPerson}
          contactPhone={venue.contactPhone}
        />
      ))}
    </div>
  );
}