'use client';

import { forwardRef, type FormHTMLAttributes, type KeyboardEvent } from 'react';

// Multi-field forms otherwise submit natively when Enter is pressed in any
// single-line input, saving mid-edit before the admin ever clicks the Save
// button. Swap `<form>` for this in any form with more than one field.
export const Form = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
  function Form({ onKeyDown, ...props }, ref) {
    return (
      <form
        {...props}
        ref={ref}
        onKeyDown={(e: KeyboardEvent<HTMLFormElement>) => {
          const target = e.target as HTMLElement;
          if (e.key === 'Enter' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
            e.preventDefault();
          }
          onKeyDown?.(e);
        }}
      />
    );
  }
);
