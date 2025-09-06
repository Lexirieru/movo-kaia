import Image from "next/image";

interface AuthHeaderProps {
  isLoginView: boolean;
}

export default function AuthHeader({ isLoginView }: AuthHeaderProps) {
    return (
        <div className="text-center mb-8">
            <Image 
                src="/movo full.png" 
                alt="Movo Logo" 
                width={200} 
                height={200}
                className="mx-auto items-center justify-center mb-4"
            />
        {/* <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
            {isLoginView ? "Welcome Back" : "Join Movo"}
            </span>
        </h1> */}
        <p className="text-gray-300 text-sm">
            {isLoginView
          ? `Please enter your e-mail address and enter password`
          : "Please enter your e-mail address and create password"}
      </p>
    </div>
  );
}