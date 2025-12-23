import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Solar AI Platform</h1>
      <div className="mt-6 flex gap-3">
        <Link className="underline" href="/projects">Projects</Link>
        <a className="underline" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
      </div>
    </main>
  );
}
