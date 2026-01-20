import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

test("middleware should allow public login route without redirect", async () => {
  process.env.AUTH_SECRET = "test-secret";
  const request = new NextRequest("http://localhost:3000/login");
  const response = await middleware(request);

  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("middleware should redirect unauthenticated users on protected route", async () => {
  process.env.AUTH_SECRET = "test-secret";
  const request = new NextRequest("http://localhost:3000/tasks");
  const response = await middleware(request);

  assert.equal(response.headers.get("location"), "http://localhost:3000/login?callbackUrl=%2Ftasks");
});
