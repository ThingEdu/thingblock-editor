// Host stand-in for <pgmspace.h>: flash and RAM are one address space here, as on the ESP32.
#pragma once
#include <cstring>
#define PROGMEM
#define PGM_P const char *
#define PSTR(s) (s)
#define pgm_read_byte(addr) (*(const unsigned char *)(addr))
#define pgm_read_word(addr) (*(const unsigned short *)(addr))
#define pgm_read_dword(addr) (*(const unsigned long *)(addr))
#define pgm_read_pointer(addr) (*(void *const *)(addr))
#define strlen_P strlen
#define strcpy_P strcpy
#define memcpy_P memcpy
