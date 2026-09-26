import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
          <p className="text-zinc-400 text-sm">Signed in as: {user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium transition hover:bg-red-700 cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}