import SignInForm  from "@/components/auth/signin-form";
import { Suspense } from "react";

const SignInPage = () => {
    return (
        <div className="flex flex-col justify-center items-center bg-white dark:bg-black p-4 min-h-screen">
            <div className="bg-white dark:bg-black shadow-sm mx-auto p-8 border border-gray-100  dark:border-gray-800 rounded-lg w-full max-w-md">
                <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
                    <SignInForm />
                </Suspense>
            </div>
        </div>
    )
};

export default SignInPage
