"use client";

import type { ComponentPropsWithoutRef } from "react";

type MotionOnlyProps = {
  animate?: unknown;
  initial?: unknown;
  transition?: unknown;
  viewport?: unknown;
  whileInView?: unknown;
};

type MotionDivProps = Omit<ComponentPropsWithoutRef<"div">, keyof MotionOnlyProps> & MotionOnlyProps;
type MotionSectionProps = Omit<ComponentPropsWithoutRef<"section">, keyof MotionOnlyProps> & MotionOnlyProps;

function stripMotionProps<T extends MotionOnlyProps>(props: T) {
  const { animate, initial, transition, viewport, whileInView, ...domProps } = props;
  void animate;
  void initial;
  void transition;
  void viewport;
  void whileInView;

  return domProps;
}

export function MotionDiv(props: MotionDivProps) {
  return <div {...stripMotionProps(props)} />;
}

export function MotionSection(props: MotionSectionProps) {
  return <section {...stripMotionProps(props)} />;
}
