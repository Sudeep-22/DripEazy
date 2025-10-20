import Link from "next/link";
export default function Home() {
  return (
    <div className="w-full h-screen flex flex-col justify-center items-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hi this is home page</h1>
      </div>
      <div className="px-4 space-x-4 text-blue-500 underline">
        <Link href='/signIn'> Link to SignIn</Link>
        <Link href='/signUp'> Link to SignUp</Link>
      </div>
    </div>
  );
}
