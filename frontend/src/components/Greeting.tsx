import React from 'react';

interface GreetingProps {
  name: string;
}

export const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return (
    <div className="card">
      <h2>Hello, {name}!</h2>
      <p>This is a reusable component.</p>
    </div>
  );
};
