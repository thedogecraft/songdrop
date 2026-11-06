import { Input } from "@/components/ui/input";

function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center  p-24">
      <h1 className="text-4xl font-bold">
        Share Music On all platforms with Songdrop
      </h1>

      <Input placeholder="Enter a Spotify or Apple Music Link" />
    </div>
  );
}

export default Page;
