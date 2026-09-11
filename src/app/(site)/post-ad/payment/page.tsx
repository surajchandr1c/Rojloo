"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";
import { paymentInfo, siteInfo } from "@/lib/site";
import { PaymentOptionsSkeleton } from "@/components/skeletons/post-ad-skeletons";
import { PaymentSkeleton } from "@/components/ui/skeleton";

type UPI = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
};

function PaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ready = useAuthGuard();
  const [upis, setUpis] = useState<UPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountError, setDiscountError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTxId, setSubmittedTxId] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState<"pending" | "confirmed" | "declined">("pending");
  const [declineReason, setDeclineReason] = useState("");

  const coins = Number(searchParams.get("coins") ?? "0");
  const price = searchParams.get("price") ?? "";

  useEffect(() => {
    if (!submitted || !submittedTxId || submittedStatus !== "pending") return;

    let cancelled = false;
    async function checkStatus() {
      try {
        const res = await fetch("/api/payment-confirmation", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const requests = Array.isArray(data.requests) ? data.requests : [];
        const current = requests.find(
          (r: { transactionId?: string; status?: string; declinedReason?: string }) =>
            r.transactionId?.trim().toLowerCase() === submittedTxId.trim().toLowerCase()
        );
        if (current && !cancelled) {
          if (current.status === "declined") {
            setSubmittedStatus("declined");
            setDeclineReason(current.declinedReason || "Wrong Transaction ID");
          } else if (current.status === "confirmed") {
            setSubmittedStatus("confirmed");
            window.dispatchEvent(new CustomEvent("coins:updated"));
          }
        }
      } catch {}
    }

    const interval = setInterval(checkStatus, 3000);
    void checkStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [submitted, submittedTxId, submittedStatus]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadUPIs() {
      try {
        const res = await fetch("/api/admin/upi?mode=payment");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUpis(data.upis || (data.upi ? [data.upi] : []));
        }
      } catch (err) {
        console.error("Failed to load UPIs:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUPIs();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setDiscountError("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    try {
      setDiscountError("");
      const amount = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
      const response = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDiscountError(data.error || "Invalid coupon code");
        setDiscount(0);
        return;
      }

      const data = await response.json();
      setDiscount(data.discount);
      setDiscountError("");
    } catch (err) {
      setDiscountError("Failed to validate coupon");
      console.error(err);
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handleSubmitTransaction() {
    if (!transactionId.trim()) {
      setSubmitError("Please enter a transaction ID");
      return;
    }

    const txnToSubmit = transactionId.trim();
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/payment-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coins,
          amount: price.replace(/[^\d.]/g, ""),
          transactionId: txnToSubmit,
          couponCode: couponCode.trim() || null,
          discount,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSubmitError(data.error || "Failed to record transaction");
        return;
      }

      setSubmitted(true);
      setSubmittedTxId(txnToSubmit);
      setSubmittedStatus("pending");
      setDeclineReason("");
      window.dispatchEvent(new CustomEvent("coins:updated"));
      setTransactionId("");
      setCouponCode("");
      setDiscount(0);
    } catch (err) {
      setSubmitError("Failed to submit transaction. Please check your network and try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return <PaymentSkeleton />;

  const amount = price.replace(/[^\d.]/g, "");
  const finalAmount = Math.max(0, parseFloat(amount) - discount);
  const upiLink = `upi://pay?pa=${encodeURIComponent(
    paymentInfo.upiId
  )}&pn=${encodeURIComponent(paymentInfo.upiName)}&am=${encodeURIComponent(
    finalAmount.toString()
  )}&cu=INR&tn=${encodeURIComponent(`Buy ${coins} coins on ${siteInfo.name}`)}`;
  const defaultQrSrc = "/surajkumar40407@ybl.jpeg";

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
            Complete Payment
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad/buy-coin")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        <div className="mt-6 rounded-[1.75rem] bg-white p-6 text-center sm:p-8">
          {!submitted && (
            <>
              <p className="text-lg font-bold text-red-950">
                Pay {price || "—"} &nbsp;·&nbsp; Get {coins} coins
              </p>
              <p className="mt-1 text-sm text-red-900">
                Scan the QR code with any UPI app or use the UPI ID below.
              </p>
            </>
          )}
          {submitted && submittedStatus === "pending" && (
            <div className="rounded-[1.5rem] border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-xl font-black text-green-900">Payment submitted</p>
              <p className="mt-2 text-base text-green-800">
                Don&apos;t pay again. Please wait to confirm the payment.
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => router.push("/post-ad/payment-history")}
                  className="!text-white"
                >
                  Show payment history
                </Button>
              </div>
            </div>
          )}

          {submitted && submittedStatus === "declined" && (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-xl font-black text-red-900">Payment Declined</p>
              <p className="mt-2 text-base font-semibold text-red-800">
                {declineReason || "Wrong Transaction ID"}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedTxId("");
                    setSubmittedStatus("pending");
                    setDeclineReason("");
                  }}
                  className="!text-white"
                >
                  Try Again
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => router.push("/post-ad/payment-history")}
                  className="!text-black"
                >
                  Show payment history
                </Button>
              </div>
            </div>
          )}

          {submitted && submittedStatus === "confirmed" && (
            <div className="rounded-[1.5rem] border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-xl font-black text-green-900">Payment Confirmed!</p>
              <p className="mt-2 text-base text-green-800">
                Coins have been added to your wallet.
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => router.push("/post-ad/payment-history")}
                  className="!text-white"
                >
                  Show payment history
                </Button>
              </div>
            </div>
          )}

          {!submitted && (
            <>
              {/* Coupon Section */}
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={couponCode}
                    disabled={applyingCoupon}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (optional)"
                    className="min-w-0 flex-1 rounded-lg border border-red-200 px-3 py-2 text-red-950 placeholder-red-400 focus:border-red-500 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={applyingCoupon}
                    className="w-full sm:w-auto rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {applyingCoupon && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {applyingCoupon ? "Applying..." : "Apply"}
                  </button>
                </div>
                {discountError && (
                  <p className="mt-2 text-sm text-red-600 text-left font-medium">{discountError}</p>
                )}
                {discount > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-green-100 p-3">
                    <p className="font-semibold text-green-900">Discount Applied</p>
                    <p className="text-lg font-bold text-green-900">-₹{discount.toFixed(2)}</p>
                  </div>
                )}
                {discount > 0 && (
                  <p className="mt-2 text-sm font-semibold text-red-950">
                    Final Amount: ₹{finalAmount.toFixed(2)}
                  </p>
                )}
              </div>
              {loading ? (
                <PaymentOptionsSkeleton />
              ) : upis.length > 0 ? (
                <div className="mt-6 space-y-6">
                  {upis.map((upi) => (
                    <div key={upi._id} className="rounded-xl bg-red-50 p-6">
                      <div className="mt-4 flex justify-center">
                        {upi.qrCode ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={upi.qrCode}
                            alt={`UPI payment QR code for ${upi.upiId}`}
                            width={240}
                            height={240}
                            className="h-52 w-52 sm:h-60 sm:w-60 max-w-full rounded-2xl border-2 border-red-200 bg-white p-2 object-contain"
                          />
                        ) : (
                          <div className="h-52 w-52 sm:h-60 sm:w-60 max-w-full rounded-2xl border-2 border-red-200 bg-white p-2 flex items-center justify-center text-red-900">
                            No QR Code
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                          UPI ID
                        </p>
                        <p className="mt-1 text-base sm:text-lg font-black text-red-950 break-all">
                          {upi.upiId}
                        </p>
                      </div>

                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="solid"
                          className="!text-white w-full"
                          onClick={() => {
                            const link = `upi://pay?pa=${encodeURIComponent(
                              upi.upiId
                            )}&pn=${encodeURIComponent(upi.name)}&am=${encodeURIComponent(
                              finalAmount.toString()
                            )}&cu=INR&tn=${encodeURIComponent(
                              `Buy ${coins} coins on ${siteInfo.name}`
                            )}`;
                            window.location.href = link;
                          }}
                        >
                          Pay via UPI App
                        </Button>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-red-950 text-left">
                          Transaction ID
                        </label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            disabled={submitting}
                            value={transactionId}
                            onChange={(e) => {
                              setTransactionId(e.target.value);
                              if (submitError) setSubmitError("");
                            }}
                            placeholder="Enter UPI transaction ID"
                            className="min-w-0 flex-1 rounded-lg border border-red-200 px-3 py-2 text-red-950 placeholder-red-400 focus:border-red-500 focus:outline-none disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={handleSubmitTransaction}
                            disabled={submitting}
                            className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:whitespace-nowrap cursor-pointer"
                          >
                            {submitting && (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            {submitting ? "Submitting..." : "Submit"}
                          </button>
                        </div>
                        {submitError && (
                          <p className="mt-2 text-sm text-red-600 font-medium text-left">{submitError}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mt-6 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultQrSrc}
                      alt="UPI payment QR code"
                      width={240}
                      height={240}
                      className="h-52 w-52 sm:h-60 sm:w-60 max-w-full rounded-2xl border-2 border-red-200 bg-white p-2 object-contain"
                    />
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      UPI ID
                    </p>
                    <p className="mt-1 text-base sm:text-lg font-black text-red-950 break-all">
                      {paymentInfo.upiId}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      type="button"
                      variant="solid"
                      className="!text-white"
                      onClick={() => {
                        window.location.href = upiLink;
                      }}
                    >
                      Pay via UPI App
                    </Button>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-red-950 text-left">
                      Transaction ID
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        disabled={submitting}
                        value={transactionId}
                        onChange={(e) => {
                          setTransactionId(e.target.value);
                          if (submitError) setSubmitError("");
                        }}
                        placeholder="Enter UPI transaction ID"
                        className="min-w-0 flex-1 rounded-lg border border-red-200 px-3 py-2 text-red-950 placeholder-red-400 focus:border-red-500 focus:outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={handleSubmitTransaction}
                        disabled={submitting}
                        className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:whitespace-nowrap cursor-pointer"
                      >
                        {submitting && (
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {submitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                    {submitError && (
                      <p className="mt-2 text-sm text-red-600 font-medium text-left">{submitError}</p>
                    )}
                  </div>
                </>
              )}

              <p className="mt-6 text-sm text-red-900">
                After paying, your coins will be added once the payment is verified.
                Keep the payment screenshot for reference.
              </p>
            </>
          )}
        </div>
      </SectionPanel>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PaymentSkeleton />}>
      <PaymentView />
    </Suspense>
  );
}
