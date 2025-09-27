import { supabase } from "../supabase";

export function SignOutButton() {
  // Sign out user and redirect to login
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center justify-center gap-2 rounded-md text-sm font-medium cursor-pointer border h-10 px-4 py-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sign Out
    </button>
  );
}