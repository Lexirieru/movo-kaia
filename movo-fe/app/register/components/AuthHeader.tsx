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

        <p className="text-gray-300 text-sm">
            {isLoginView
          ? `Please enter your e-mail address and enter password`
          : "Please enter your e-mail address and create password"}
      </p>
    </div>
  );
}