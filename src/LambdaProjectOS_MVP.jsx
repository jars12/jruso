import React, { useState } from "react";

import { Select } from "./components/ui/select";

const ENVIRONMENT_OPTIONS = [
  { value: "dev", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Production" },
];

export default function LambdaProjectOS_MVP() {
  const [environment, setEnvironment] = useState("dev");

  return (
    <section>
      <label htmlFor="environment-select">Deployment environment</label>
      <Select
        id="environment-select"
        value={environment}
        onChange={(event) => setEnvironment(event.target.value)}
        items={ENVIRONMENT_OPTIONS}
      />
    </section>
  );
}
