"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";

export interface TransactionStep {
  id: string;
  title: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  transactionHash?: string;
}

interface TransactionStatusProps {
  steps: TransactionStep[];
  isVisible: boolean;
  onComplete?: () => void;
}

export default function TransactionStatus({ steps, isVisible, onComplete }: TransactionStatusProps) {
  // const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (steps.every(step => step.status === 'success')) {
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  }, [steps, onComplete]);

  if (!isVisible) return null;

  const allStepsCompleted = steps.every(step => step.status === 'success');
  const hasError = steps.some(step => step.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-cyan-400/20 rounded-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          {allStepsCompleted ? (
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          ) : hasError ? (
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}

          <h3 className="text-xl font-semibold text-white mb-2">
            {allStepsCompleted ? 'Escrow Created Successfully!' : 'Creating Escrow...'}
          </h3>
          
          {hasError && (
            <p className="text-red-400 text-sm">
              There was an error creating your escrow. Please try again.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.status === 'success' 
                  ? 'bg-green-500 text-white' 
                  : step.status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-cyan-500 text-white'
              }`}>
                {step.status === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : step.status === 'error' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
              </div>

              <div className="flex-1">
                <div className={`font-medium ${
                  step.status === 'success' ? 'text-green-400' : 
                  step.status === 'error' ? 'text-red-400' : 'text-white'
                }`}>
                  {step.title}
                </div>
                {step.message && (
                  <div className="text-gray-400 text-sm">{step.message}</div>
                )}
                {step.transactionHash && (
                  <a
                    href={`https://basescan.org/tx/${step.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-xs"
                  >
                    <span>View on BaseScan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {allStepsCompleted && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-300 text-sm text-center">
              Your escrow has been created on the blockchain! Redirecting to dashboard...
            </p>
          </div>
        )}

        {hasError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-300 text-sm text-center">
              Please check your wallet and try again. Make sure you have sufficient balance and approved the tokens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
