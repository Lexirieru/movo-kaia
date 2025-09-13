interface AuthToggleProps {
  isLoginView: boolean;
  onToggle: () => void;
}

export default function AuthToggle({ isLoginView, onToggle }: AuthToggleProps) {
  return (
    <div className="mt-8 text-center">
      <p className="text-gray-400 text-sm"></p>
    </div>
  );
}
