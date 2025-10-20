import React from 'react'
import SignUpForm from '@/components/SignUpForm'
import Link from 'next/link'

const page = () => {
  return (
    <div className="flex min-h-screen">
    {/* Left column (only visible on md and above) */}
        <div className="hidden md:flex w-2/5 bg-gradient-to-br from-blue-600 to-cyan-400 p-8  flex-col justify-center items-center text-white">
            <h2 className="text-4xl font-semibold">Welcome Back!</h2>
        </div>

    {/* Right column (always visible) */}
        <div className="bg-white text-black w-full md:w-3/5 flex flex-col justify-center items-center gap-6">
            <SignUpForm />
            <p>Already have an account. <Link href='/signIn' className='text-blue-500'>Sign In</Link></p>
        </div>
    </div>
  )
}

export default page
