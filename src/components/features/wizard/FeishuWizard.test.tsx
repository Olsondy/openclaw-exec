import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeishuWizard } from "./FeishuWizard";

const patchConfigMock = vi.fn();
vi.mock("../../../hooks/useGatewayConfig", () => ({
	useGatewayConfig: () => ({
		patchConfig: patchConfigMock,
	}),
}));

describe("FeishuWizard", () => {
	beforeEach(() => {
		patchConfigMock.mockReset();
		patchConfigMock.mockResolvedValue(true);
	});

	it("submits feishu channel config via operator config.patch", async () => {
		const onSuccess = vi.fn();
		render(<FeishuWizard onSuccess={onSuccess} onClose={() => {}} />);

		fireEvent.change(screen.getByPlaceholderText("App ID (例: cli_xxxxxxxx)"), {
			target: { value: "cli_test_app" },
		});
		fireEvent.change(screen.getByPlaceholderText("App Secret"), {
			target: { value: "secret_test_value" },
		});
		fireEvent.click(screen.getByRole("button", { name: "提交" }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(patchConfigMock).toHaveBeenCalledTimes(1);
		expect(patchConfigMock).toHaveBeenCalledWith({
			channels: {
				feishu: {
					enabled: true,
					appId: "cli_test_app",
					appSecret: "secret_test_value",
				},
			},
		});
	});
});
