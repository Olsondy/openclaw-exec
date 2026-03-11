import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiWizard } from "./ApiWizard";

const patchConfigMock = vi.fn();
vi.mock("../../../hooks/useGatewayConfig", () => ({
	useGatewayConfig: () => ({
		patchConfig: patchConfigMock,
	}),
}));

describe("ApiWizard", () => {
	beforeEach(() => {
		patchConfigMock.mockReset();
		patchConfigMock.mockResolvedValue(true);
	});

	it("submits model settings via operator config.patch", async () => {
		const onSuccess = vi.fn();
		render(<ApiWizard onSuccess={onSuccess} onClose={() => {}} />);

		fireEvent.change(screen.getByLabelText("模型供应商"), {
			target: { value: "openai" },
		});
		fireEvent.change(screen.getByLabelText("模型 ID"), {
			target: { value: "gpt-4o-mini" },
		});
		fireEvent.change(screen.getByLabelText("模型名称"), {
			target: { value: "GPT-4o mini" },
		});
		fireEvent.change(screen.getByLabelText("API Key"), {
			target: { value: "sk-test" },
		});
		fireEvent.click(screen.getByRole("button", { name: "提交" }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
		expect(patchConfigMock).toHaveBeenCalledTimes(1);
		const patch = patchConfigMock.mock.calls[0][0] as Record<string, unknown>;
		const models = patch.models as Record<string, unknown>;
		const providers = models.providers as Record<string, unknown>;
		const openai = providers.openai as Record<string, unknown>;
		expect(openai.apiKey).toBe("sk-test");
		expect(openai.baseUrl).toBe("https://api.openai.com/v1");
		expect(openai.api).toBe("openai-completions");
	});
});
