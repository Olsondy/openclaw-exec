import React from "react";

interface CardProps {
	children: React.ReactNode;
	className?: string;
	elevated?: boolean;
	style?: React.CSSProperties;
}

export function Card({
	children,
	className = "",
	elevated = false,
	style,
}: CardProps) {
	return (
		<div
			className={`bg-card-bg border border-card-border rounded-xl p-4 ${elevated ? "shadow-elevation-2" : ""} ${className}`}
			style={style}
		>
			{children}
		</div>
	);
}
