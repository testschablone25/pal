"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Copy, Check } from "lucide-react";

interface ItemQRDialogProps {
	itemId: string;
	itemName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ItemQRDialog({
	itemId,
	itemName,
	open,
	onOpenChange,
}: ItemQRDialogProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [qrSvg, setQrSvg] = useState<string | null>(null);
	const [qrToken, setQrToken] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (open) {
			fetchQRCode();
		}
	}, [open, itemId]);

	const fetchQRCode = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/items/${itemId}/qr`);
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || "Failed to generate QR code");
			}
			const data = await response.json();
			setQrSvg(data.svg);
			setQrToken(data.token);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = () => {
		if (!qrSvg) return;

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			alert("Please allow popups to print the QR code");
			return;
		}

		printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${itemName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            .qr-container svg {
              width: 300px;
              height: 300px;
            }
            .item-name {
              margin-top: 16px;
              font-size: 18px;
              font-weight: 600;
            }
            .token {
              margin-top: 8px;
              font-size: 12px;
              color: #666;
              font-family: monospace;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${qrSvg}
            <div class="item-name">${itemName}</div>
            <div class="token">${qrToken || ""}</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
		printWindow.document.close();
	};

	const handleCopyToken = async () => {
		if (!qrToken) return;
		try {
			await navigator.clipboard.writeText(qrToken);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback
			const textarea = document.createElement("textarea");
			textarea.value = qrToken;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
				<DialogHeader>
					<DialogTitle className="text-white">QR Code — {itemName}</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4 py-4">
					{loading ? (
						<div className="flex items-center justify-center h-[300px]">
							<Loader2 className="h-8 w-8 animate-spin text-violet-400" />
						</div>
					) : error ? (
						<div className="flex flex-col items-center gap-2 text-red-400">
							<p className="text-sm text-center">{error}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={fetchQRCode}
								className="border-zinc-800"
							>
								Retry
							</Button>
						</div>
					) : (
						<>
							{/* QR Code SVG */}
							<div
								className="bg-white p-4 rounded-lg"
								dangerouslySetInnerHTML={{ __html: qrSvg || "" }}
							/>

							{/* Token */}
							{qrToken && (
								<div className="w-full flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
									<code className="flex-1 text-xs text-zinc-400 truncate font-mono">
										{qrToken}
									</code>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleCopyToken}
										className="h-7 w-7 shrink-0"
									>
										{copied ? (
											<Check className="h-3.5 w-3.5 text-green-400" />
										) : (
											<Copy className="h-3.5 w-3.5 text-zinc-400" />
										)}
									</Button>
								</div>
							)}

							{/* Actions */}
							<div className="flex gap-2 w-full">
								<Button
									onClick={handlePrint}
									className="flex-1 bg-violet-600 hover:bg-violet-700"
								>
									<Printer className="h-4 w-4 mr-2" />
									Print
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
