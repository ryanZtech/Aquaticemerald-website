"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

export interface AccordionItemData {
  id: number | string;
  title: string;
  body: string;
}

export default function Accordion({ items }: { items: AccordionItemData[] }) {
  const [openIds, setOpenIds] = useState<Set<number | string>>(new Set());

  const toggle = (id: number | string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const open = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className={`bg-card border rounded-2xl overflow-hidden transition-colors duration-200 ${
              open ? "border-primary/40" : "border-border hover:border-primary/30"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={open}
              className="flex items-center justify-between gap-4 w-full px-5 py-4 cursor-pointer text-left font-medium text-sm select-none hover:bg-accent transition-colors"
            >
              <span>{item.title}</span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex-shrink-0 transition-colors ${open ? "text-primary" : "text-muted-foreground"}`}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed font-light whitespace-pre-line">
                    {item.body}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
