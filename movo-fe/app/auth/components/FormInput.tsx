import { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

interface FormInputProps {
  type: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: LucideIcon;
  showPasswordToggle?: boolean;
  required?: boolean;
  disabled?: boolean;   // ⬅️ tambahin
  readOnly?: boolean;   // ⬅️ tambahin
}

export default function FormInput({
  type,
  name,
  placeholder,
  value,
  onChange,
  icon: Icon,
  showPasswordToggle = false,
  required = false,
  disabled = false,     // ⬅️ tambahin
  readOnly = false,     // ⬅️ tambahin
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative group">
      <Icon
        className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${
          isFocused ? "text-cyan-400" : "text-gray-400"
        }`}
      />
      <input
        type={inputType}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full pl-12 ${
          showPasswordToggle ? "pr-12" : "pr-4"
        } py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-200 hover:bg-white/10 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        required={required}
        disabled={disabled}   // ⬅️ diteruskan
        readOnly={readOnly}   // ⬅️ diteruskan
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-200"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
