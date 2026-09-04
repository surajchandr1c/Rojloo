import Button from "@/components/ui/button";

export default function SearchBar() {
  return (
    <form
      action="/places"
      method="get"
      className="mx-auto mt-7 flex max-w-xl flex-col gap-3 sm:flex-row"
    >
      <input
        name="q"
        placeholder="Search services or places..."
        className="w-full rounded-full border border-pink-200 bg-pink-50 px-4 py-3 text-center text-red-950 outline-none placeholder:text-red-300 focus:border-red-500 sm:text-left"
      />
      <Button type="submit" variant="solid">
        Search
      </Button>
    </form>
  );
}
