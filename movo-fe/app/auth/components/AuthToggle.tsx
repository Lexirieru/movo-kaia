interface AuthToggleProps {
  isLoginView: boolean;
  onToggle: () => void;
}

export default function AuthToggle({ isLoginView, onToggle }: AuthToggleProps) {
  return (
    <div className="mt-8 text-center">
      <p className="text-gray-400 text-sm">
        {isLoginView ? "Don't have an account?" : "Already have an account?"}
        <button
          onClick={onToggle}
          className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors duration-200 hover:underline"
        >
          {isLoginView ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}