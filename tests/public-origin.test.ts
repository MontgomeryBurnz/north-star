import assert from "node:assert/strict";
import test from "node:test";
import { getPublicAppOrigin } from "../src/lib/public-origin.ts";

function withEnv(overrides: Record<string, string | undefined>, run: () => void) {
  const previous = new Map(Object.keys(overrides).map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("getPublicAppOrigin prefers explicit North Star app URL", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_NORTHSTAR_APP_URL: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
      NORTHSTAR_APP_URL: "https://northstar.example.com/app",
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
      VERCEL_URL: undefined
    },
    () => {
      const request = new Request("http://localhost:3000/api/admin/users", {
        headers: {
          host: "localhost:3000"
        }
      });

      assert.equal(getPublicAppOrigin(request), "https://northstar.example.com");
    }
  );
});

test("getPublicAppOrigin uses forwarded host before localhost request URLs", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_NORTHSTAR_APP_URL: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
      NORTHSTAR_APP_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
      VERCEL_URL: undefined
    },
    () => {
      const request = new Request("http://localhost:3000/api/admin/users", {
        headers: {
          "x-forwarded-host": "north-star-git-main.example.vercel.app",
          "x-forwarded-proto": "https"
        }
      });

      assert.equal(getPublicAppOrigin(request), "https://north-star-git-main.example.vercel.app");
    }
  );
});

test("getPublicAppOrigin falls back to Vercel URL when request origin is local", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_NORTHSTAR_APP_URL: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
      NORTHSTAR_APP_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: "north-star.example.vercel.app",
      VERCEL_URL: undefined
    },
    () => {
      assert.equal(getPublicAppOrigin("http://localhost:3000/api/admin/users"), "https://north-star.example.vercel.app");
    }
  );
});
