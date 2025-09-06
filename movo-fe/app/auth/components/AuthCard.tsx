import AuthHeader from "./AuthHeader";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import AuthToggle from "./AuthToggle";

interface AuthCardProps {
  isLoginView: boolean;
  setIsLoginView: (value: boolean) => void;
}

export default function AuthCard({
  isLoginView,
  setIsLoginView,
}: AuthCardProps) {
  const switchView = () => {
    setIsLoginView(!isLoginView);
  };

  return (
    <div className="relative z-10 lw-full max-w-md mx-4">
      <div className="bg-white/[0.08] backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
        <AuthHeader isLoginView={isLoginView} />

        <div className="relative overflow-hidden">
          {isLoginView ? <LoginForm /> : <RegisterForm />}
        </div>

        <AuthToggle isLoginView={isLoginView} onToggle={switchView} />
      </div>
    </div>
  );
}
