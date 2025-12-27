import React from "react";

/**
 * Select UI wrapper around the native <select> element.
 *
 * Usage:
 * <Select
 *   items={[{ value: "dev", label: "Development" }]}
 *   value={value}
 *   onChange={handleChange}
 * />
 */
export function Select({
  items = [],
  value,
  onChange,
  id,
  name,
  className,
  ...props
}) {
  return (
    <select
      id={id}
      name={name}
      className={className}
      value={value}
      onChange={onChange}
      {...props}
    >
      {items.map((item) => (
        <option
          key={item.value}
          value={item.value}
          disabled={item.disabled}
        >
          {item.label}
        </option>
      ))}
    </select>
  );
}
