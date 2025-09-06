import BankForm from "../auth/components/BankForm";


export default function BankCard() {
  return (
    <div className="relative z-10 lw-full max-w-md mx-4">
      <div className="bg-white/[0.08] backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
        <div className="relative overflow-hidden">
          <BankForm>
          </BankForm>
        </div>

      </div>
    </div>
  );
}
