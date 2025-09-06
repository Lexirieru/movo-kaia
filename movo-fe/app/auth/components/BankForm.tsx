"use client"
import { useState } from "react";
import FormInput from "./FormInput";
import { Mail } from "lucide-react";
import SubmitButton from "./SubmitButton";
import { addBankAccount } from "@/app/api/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/userContext";
import { bankDictionary } from "@/lib/dictionary";

export default function BankForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    bankName : "",
    bankAccountNumber : "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const bankCode = bankDictionary[formData.bankName];
      const response = await addBankAccount(user.email, formData.bankAccountNumber, bankCode);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(response)
      console.log(response.data)
      if (response.data) {
        router.push("/dashboard");
      } else {
        alert("Login failed, invalid bank account");
      }
    } catch (error) {
      console.error(error);
      alert("Error, please try again");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <FormInput
        type="text"
        name="bankName"
        placeholder="Bank Name"
        value={formData.bankName}
        onChange={handleInputChange}
        icon={Mail}
        required
      />
      <FormInput
        type="text"
        name="bankAccountNumber"
        placeholder="Bank Account Number"
        value={formData.bankAccountNumber}
        onChange={handleInputChange}
        icon={Mail}
        required
      />

      <SubmitButton 
        isLoading={isLoading} 
        onClick={handleSubmit}
        text="Add bank account"
      />

    </div>
  );
}