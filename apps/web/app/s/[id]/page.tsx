import { prisma } from "@songdrop/db";

async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({ where: { slug: id } });

  if (!song) {
    return <div>Song not found</div>;
  }

  return (
    <div>
      <img src={song.thumbnailUrl || ""} alt={song.title} />
      <h1 className="text-2xl font-bold">{song.title}</h1>
    </div>
  );
}

export default Page;
