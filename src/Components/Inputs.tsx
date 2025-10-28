import React from "react";

interface Props {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Inputs: React.FC<Props> = ({ placeholder, value, onChange }) => {
  return <input placeholder={placeholder} value={value} onChange={onChange} />;
};

export default Inputs; // <-- IMPORTANTE
