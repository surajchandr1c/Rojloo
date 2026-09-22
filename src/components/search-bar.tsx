import Button from "@/components/ui/button";

export default function SearchBar() {
  return (
    <form
      action="/places"
      method="get"
      className="mx-auto mt-7 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input
        name="q"
        placeholder="Search services or places..."
        className="w-full min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-center text-gray-950 outline-none placeholder:text-gray-300 focus:border-gray-500 sm:text-left"
      />
      <Button type="submit" variant="solid" className="w-full sm:w-auto shrink-0">
        Search
      </Button>
    </form>
  );
}
