import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramWizard } from "./TelegramWizard";

const patchConfigMock = vi.fn();
vi.mock("../../../hooks/useGatewayConfig", () => ({
	useGatewayConfig: () => ({
		patchConfig: patchConfigMock,
	}),
}));

describe("TelegramWizard", () => {
	beforeEach(() => {
		patchConfigMock.mockReset();
		patchConfigMock.mockResolvedValue(true);
	});

	it("submits telegram channel config via operator config.patch", async () => {
		const onSuccess = vi.fn();
		render(<TelegramWizard onSuccess={onSuccess} onClose={() => {}} />);

		fireEvent.change(screen.getByPlaceholderText("例: 123456789:AAxxxxxx..."), {
			target: { value: "123456789:AA_test_token" },
		});
		fireEvent.click(screen.getByRole("button", { name: "提交" }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(patchConfigMock).toHaveBeenCalledTimes(1);
		expect(patchConfigMock).toHaveBeenCalledWith({
			channels: {
				telegram: {
					enabled: true,
					botToken: "123456789:AA_test_token",
				},
			},
		});
	});
});
