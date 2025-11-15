import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("View", null, children),
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("Text", null, children),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (styles: unknown) => styles,
    },
    LogBox: { ignoreLogs: jest.fn() },
  };
});

import ErrorBoundary from "../components/ErrorBoundary";

describe("ErrorBoundary", () => {
  it("muestra la interfaz de error cuando ocurre un fallo", () => {
    const Thrower = () => {
      throw new Error("Fallo de prueba");
    };

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { getByText } = render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    expect(getByText("Error al cargar la aplicación")).toBeTruthy();
    expect(getByText("Fallo de prueba")).toBeTruthy();

    consoleErrorSpy.mockRestore();
  });
});
